import {
  users,
  transactions,
  referrals,
  sentences,
  workProgress,
  corrections,
  accountStatus,
  withdrawals,
  identityVerification,
  bankCards,
  appSettings,
  type User,
  type UpsertUser,
  type Transaction,
  type InsertTransaction,
  type Referral,
  type Sentence,
  type WorkProgress,
  type Correction,
  type AccountStatus,
  type Withdrawal,
  type IdentityVerification,
  type BankCard,
  type InsertBankCard,
  type AppSetting,
  type InsertAppSetting,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, inArray, like, ilike, or } from "drizzle-orm";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";

export interface IStorage {
  // User operations - required for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Authentication operations
  getUserByPhone(phone: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(userData: { 
    phone?: string; 
    fullName?: string; 
    password?: string; 
    email?: string;
    firstName?: string;
    lastName?: string;
    referralCode?: string;
  }): Promise<User>;
  validateUser(phone: string, password: string): Promise<User | null>;
  
  // Transaction operations
  createTransaction(transaction: Omit<InsertTransaction, 'id' | 'reference'>): Promise<Transaction>;
  getUserTransactions(userId: string, limit?: number, type?: string, status?: string): Promise<Transaction[]>;
  updateTransactionStatus(transactionId: string, status: string): Promise<void>;
  
  // Balance operations
  updateUserBalance(userId: string, amount: number): Promise<void>;
  setUserBalance(userId: string, newBalance: number): Promise<void>;
  getUserBalance(userId: string): Promise<number>;
  
  // Referral operations
  getReferralStats(userId: string): Promise<{ totalReferrals: number; totalCommission: number; monthlyCommission: number }>;
  getUserReferrals(userId: string): Promise<(Referral & { referredUser: User })[]>;
  createReferral(referrerId: string, referredUserId: string): Promise<void>;
  
  // Work operations for SIKA TEXTE BUSINESS
  getWorkProgress(userId: string, date: string): Promise<WorkProgress | undefined>;
  updateWorkProgress(userId: string, date: string, correctionsCount: number, earnings: number): Promise<void>;
  getRandomSentences(limit?: number): Promise<Sentence[]>;
  submitCorrection(userId: string, sentenceId: string, userAnswer: string): Promise<{ correct: boolean; reward: number }>;
  
  // Account activation operations
  getAccountStatus(userId: string): Promise<AccountStatus | undefined>;
  activateAccount(userId: string): Promise<void>;
  deactivateAccount(userId: string): Promise<void>;
  
  // Withdrawal operations
  createWithdrawal(userId: string, amount: number, phoneNumber: string): Promise<Withdrawal>;
  getUserWithdrawals(userId: string): Promise<Withdrawal[]>;
  updateWithdrawalStatus(withdrawalId: string, status: string): Promise<void>;

  // Identity verification operations
  createIdentityVerification(userId: string, frontIdPhoto: string, backIdPhoto: string, selfiePhoto: string): Promise<IdentityVerification>;
  getUserIdentityVerification(userId: string): Promise<IdentityVerification | null>;
  updateIdentityVerificationStatus(verificationId: string, status: string, adminNotes?: string, reviewedBy?: string): Promise<void>;

  // Bank card operations
  createBankCard(userId: string, firstName: string, lastName: string, cardNumber: string): Promise<BankCard>;
  getUserBankCard(userId: string): Promise<BankCard | null>;
  getBankCardById(cardId: string): Promise<BankCard | null>;
  updateBankCard(cardId: string, userId: string, firstName: string, lastName: string, cardNumber: string): Promise<BankCard | null>;
  deleteBankCard(cardId: string, userId: string): Promise<boolean>;

  // Admin operations
  getTotalUsersCount(): Promise<number>;
  getTotalDepositsCount(): Promise<number>;
  getTotalWithdrawalsCount(): Promise<number>;
  getPendingWithdrawalsCount(): Promise<number>;
  getPendingDepositsCount(): Promise<number>;
  getCompletedDepositsCount(): Promise<number>;
  getCompletedWithdrawalsCount(): Promise<number>;
  searchUsersByPhone(phone: string): Promise<User[]>;
  searchUsersByPhoneOrEmail(query: string): Promise<User[]>;
  getAllUsersWithReferrals(): Promise<(User & { referralsCount: number })[]>;
  updateUserPassword(userId: string, hashedPassword: string): Promise<void>;
  blockUser(userId: string, blocked: boolean): Promise<void>;
  deleteUser(userId: string): Promise<void>;
  
  // App settings
  getAppSettings(): Promise<AppSetting[]>;
  updateAppSetting(key: string, value: string): Promise<void>;
  initializeDefaultSettings(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Helper method to get current date string
  private getCurrentDate(): string {
    return new Date().toISOString().split('T')[0];
  }
  // User operations - required for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result.length > 0 ? result[0] : undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const result = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    if (!Array.isArray(result) || result.length === 0) {
      throw new Error("Failed to create user");
    }
    return result[0] as User;
  }

  // Authentication operations
  async getUserByPhone(phone: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.phone, phone));
    return result.length > 0 ? result[0] : undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result.length > 0 ? result[0] : undefined;
  }

  async createUser(userData: { 
    phone?: string; 
    fullName?: string; 
    password?: string; 
    email?: string;
    firstName?: string;
    lastName?: string;
    referralCode?: string;
  }): Promise<User> {
    const referralCode = randomBytes(3).toString('hex').toUpperCase();
    
    const result = await db
      .insert(users)
      .values({
        phone: userData.phone,
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        fullName: userData.fullName,
        referralCode,
        referredBy: userData.referralCode ? 
          (await this.getUserByReferralCode(userData.referralCode))?.id : 
          undefined,
      })
      .returning();
    if (!Array.isArray(result) || result.length === 0) {
      throw new Error("Failed to create user");
    }
    const user = result[0] as User;

    // Create account status (inactive by default)
    await db.insert(accountStatus).values({
      userId: user.id,
      isActive: false,
      activationFee: '3600'
    });

    // Create referral relationship if referred
    if (userData.referralCode) {
      const referrer = await this.getUserByReferralCode(userData.referralCode);
      if (referrer) {
        await this.createReferral(referrer.id, user.id);
      }
    }

    return user;
  }

  async validateUser(phone: string, password: string): Promise<User | null> {
    const user = await this.getUserByPhone(phone);
    if (!user) return null;

    // For demo purposes, accept any password for now
    // In production, you would validate against a hashed password
    return user;
  }

  private async getUserByReferralCode(referralCode: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.referralCode, referralCode));
    return result[0];
  }

  // Transaction operations
  async createTransaction(transaction: Omit<InsertTransaction, 'id' | 'reference'>): Promise<Transaction> {
    const reference = `TXN${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    const [newTransaction] = await db
      .insert(transactions)
      .values({
        ...transaction,
        reference,
      })
      .returning();

    return newTransaction;
  }

  async getUserTransactions(userId: string, limit = 50, type?: string, status?: string, categories?: string): Promise<Transaction[]> {
    const conditions = [eq(transactions.userId, userId)];

    // Apply category filter (comma-separated list of transaction types)
    if (categories) {
      const categoryTypes = categories.split(',').map(t => t.trim());
      if (categoryTypes.length > 0) {
        conditions.push(inArray(transactions.type, categoryTypes));
      }
    }

    // Apply specific type filter (overrides category filter)
    if (type && type !== 'all') {
      conditions.push(eq(transactions.type, type));
    }
    if (status && status !== 'all') {
      conditions.push(eq(transactions.status, status));
    }

    return await db
      .select()
      .from(transactions)
      .where(and(...conditions))
      .orderBy(desc(transactions.createdAt))
      .limit(limit);
  }

  async updateTransactionStatus(transactionId: string, status: string): Promise<void> {
    await db
      .update(transactions)
      .set({ status })
      .where(eq(transactions.id, transactionId));
  }

  // Balance operations
  async updateUserBalance(userId: string, amount: number): Promise<void> {
    await db
      .update(users)
      .set({ 
        balance: sql`${users.balance} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async setUserBalance(userId: string, newBalance: number): Promise<void> {
    await db
      .update(users)
      .set({ 
        balance: newBalance.toString(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async getUserBalance(userId: string): Promise<number> {
    const [user] = await db.select({ balance: users.balance }).from(users).where(eq(users.id, userId));
    return parseFloat(user?.balance || '0');
  }

  // Referral operations (updated for SIKA TEXTE BUSINESS)
  async getReferralStats(userId: string): Promise<{ totalReferrals: number; totalCommission: number; monthlyCommission: number }> {
    const [stats] = await db
      .select({
        totalReferrals: sql<number>`count(*)`,
        totalCommission: sql<number>`coalesce(sum(${referrals.commission}), 0)`,
      })
      .from(referrals)
      .where(eq(referrals.referrerId, userId));

    // Calculate monthly commission (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const [monthlyStats] = await db
      .select({
        monthlyCommission: sql<number>`coalesce(sum(${referrals.commission}), 0)`,
      })
      .from(referrals)
      .where(and(
        eq(referrals.referrerId, userId),
        sql`${referrals.createdAt} >= ${thirtyDaysAgo.toISOString()}`
      ));

    return {
      totalReferrals: Number(stats.totalReferrals),
      totalCommission: Number(stats.totalCommission),
      monthlyCommission: Number(monthlyStats.monthlyCommission),
    };
  }

  async getUserReferrals(userId: string): Promise<(Referral & { referredUser: User })[]> {
    return await db
      .select({
        id: referrals.id,
        referrerId: referrals.referrerId,
        referredUserId: referrals.referredUserId,
        commission: referrals.commission,
        createdAt: referrals.createdAt,
        referredUser: users,
      })
      .from(referrals)
      .leftJoin(users, eq(referrals.referredUserId, users.id))
      .where(eq(referrals.referrerId, userId));
  }

  async createReferral(referrerId: string, referredUserId: string): Promise<void> {
    // Create referral record without commission - commission will be awarded on account activation
    await db.insert(referrals).values({
      referrerId,
      referredUserId,
      commission: '0', // Will be updated when referred user activates account
    });
  }
  
  // SIKA TEXTE BUSINESS - Work operations
  async getWorkProgress(userId: string, date: string): Promise<WorkProgress | undefined> {
    const [progress] = await db
      .select()
      .from(workProgress)
      .where(and(
        eq(workProgress.userId, userId),
        eq(workProgress.date, date)
      ));
    return progress;
  }
  
  async updateWorkProgress(userId: string, date: string, correctionsCount: number, earnings: number): Promise<void> {
    await db
      .insert(workProgress)
      .values({
        userId,
        date,
        correctionsCount,
        earningsToday: earnings.toString(),
        lastCorrectionAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [workProgress.userId, workProgress.date],
        set: {
          correctionsCount,
          earningsToday: earnings.toString(),
          lastCorrectionAt: new Date(),
        },
      });
  }
  
  async getRandomSentences(limit = 5): Promise<Sentence[]> {
    // For now, create some sample sentences if none exist
    const count = await db.select({ count: sql<number>`count(*)` }).from(sentences);
    
    if (Number(count[0].count) === 0) {
      // Insert sample sentences
      const sampleSentences = [
        {
          text: "Je mange une pomme rouge qui est tres délicieuse.",
          correctedText: "Je mange une pomme rouge qui est très délicieuse.",
          errorCount: 1
        },
        {
          text: "Les enfants joues dans le jardin avec leurs ballon.",
          correctedText: "Les enfants jouent dans le jardin avec leur ballon.",
          errorCount: 2
        },
        {
          text: "Ma soeur et moi allons a l'école chaque mattin.",
          correctedText: "Ma sœur et moi allons à l'école chaque matin.",
          errorCount: 3
        },
        {
          text: "Le chat noir dors sur le canapé bleux.",
          correctedText: "Le chat noir dort sur le canapé bleu.",
          errorCount: 2
        },
        {
          text: "Nous mangons des fruit et des légume pour être en bonne santée.",
          correctedText: "Nous mangeons des fruits et des légumes pour être en bonne santé.",
          errorCount: 3
        },
        {
          text: "Il fait beau aujourd'hui, nous irons nous promener dans la foret.",
          correctedText: "Il fait beau aujourd'hui, nous irons nous promener dans la forêt.",
          errorCount: 1
        },
        {
          text: "J'ai acheté des fleures pour ma maman hier soire.",
          correctedText: "J'ai acheté des fleurs pour ma maman hier soir.",
          errorCount: 2
        },
        {
          text: "Les oiseaux chantes dans les arbres tous les mattins.",
          correctedText: "Les oiseaux chantent dans les arbres tous les matins.",
          errorCount: 2
        },
        {
          text: "Mon frere va a l'université pour étudier la médecinne.",
          correctedText: "Mon frère va à l'université pour étudier la médecine.",
          errorCount: 3
        },
        {
          text: "Elle porte une robe blanche et des chaussures vertes tres jolies.",
          correctedText: "Elle porte une robe blanche et des chaussures vertes très jolies.",
          errorCount: 1
        },
        {
          text: "Nous partons en vacance à la mer cet été avec nos amis.",
          correctedText: "Nous partons en vacances à la mer cet été avec nos amis.",
          errorCount: 1
        },
        {
          text: "Le chien cours après le ballon dans le parc publique.",
          correctedText: "Le chien court après le ballon dans le parc public.",
          errorCount: 2
        },
        {
          text: "Ma grand-mere cuisine des gateaux délicieux chaque dimanche.",
          correctedText: "Ma grand-mère cuisine des gâteaux délicieux chaque dimanche.",
          errorCount: 2
        },
        {
          text: "Les étudiant travaillent dur pour réussir leurs examens finaux.",
          correctedText: "Les étudiants travaillent dur pour réussir leurs examens finaux.",
          errorCount: 1
        },
        {
          text: "Il a acheté une voiture rouge et une moto noire hier après-middi.",
          correctedText: "Il a acheté une voiture rouge et une moto noire hier après-midi.",
          errorCount: 1
        },
        {
          text: "Les professeur donnent des cours interessants sur l'histoire africaine.",
          correctedText: "Les professeurs donnent des cours intéressants sur l'histoire africaine.",
          errorCount: 2
        },
        {
          text: "Nous devons faire nos devoires avant de regarder la télévision.",
          correctedText: "Nous devons faire nos devoirs avant de regarder la télévision.",
          errorCount: 1
        },
        {
          text: "La bibliothèque est ouverte tous les jours sauf le dimenche.",
          correctedText: "La bibliothèque est ouverte tous les jours sauf le dimanche.",
          errorCount: 1
        },
        {
          text: "Mon ami vient de France et parle tres bien le français.",
          correctedText: "Mon ami vient de France et parle très bien le français.",
          errorCount: 1
        },
        {
          text: "Les marchés vendents des legumes frais et des fruits de saison.",
          correctedText: "Les marchés vendent des légumes frais et des fruits de saison.",
          errorCount: 2
        },
        {
          text: "Elle écris une lettre a sa famille qui vit en Europe.",
          correctedText: "Elle écrit une lettre à sa famille qui vit en Europe.",
          errorCount: 2
        },
        {
          text: "Nous avons visité le musée d'art moderne la semainne dernière.",
          correctedText: "Nous avons visité le musée d'art moderne la semaine dernière.",
          errorCount: 1
        },
        {
          text: "Les enfants aiments jouer au football dans la cours de l'école.",
          correctedText: "Les enfants aiment jouer au football dans la cour de l'école.",
          errorCount: 2
        },
        {
          text: "Il faut boire beaucoup d'eau quand il fait tres chaud dehors.",
          correctedText: "Il faut boire beaucoup d'eau quand il fait très chaud dehors.",
          errorCount: 1
        },
        {
          text: "Ma tante viens nous rendre visite chaque année en décembre.",
          correctedText: "Ma tante vient nous rendre visite chaque année en décembre.",
          errorCount: 1
        }
      ];
      
      await db.insert(sentences).values(sampleSentences);
    }
    
    return await db
      .select()
      .from(sentences)
      .where(eq(sentences.isActive, true))
      .orderBy(sql`random()`)
      .limit(limit);
  }
  
  async submitCorrection(userId: string, sentenceId: string, userAnswer: string): Promise<{ correct: boolean; reward: number }> {
    // Get the sentence
    const [sentence] = await db.select().from(sentences).where(eq(sentences.id, sentenceId));
    if (!sentence) {
      throw new Error('Phrase non trouvée');
    }
    
    // Check if answer is correct (flexible comparison ignoring final punctuation)
    const normalizeText = (text: string): string => {
      return text.toLowerCase().trim().replace(/[.!?;,]+$/, '').trim();
    };
    
    const userNormalized = normalizeText(userAnswer);
    const correctNormalized = normalizeText(sentence.correctedText);
    const isCorrect = userNormalized === correctNormalized;
    const reward = isCorrect ? 650 : 0; // 650 FCFA per correct answer
    
    // Record the correction
    await db.insert(corrections).values({
      userId,
      sentenceId,
      userAnswer,
      isCorrect,
      earnedAmount: reward.toString(),
    });
    
    // Update work progress if correct
    if (isCorrect) {
      const today = this.getCurrentDate();
      const currentProgress = await this.getWorkProgress(userId, today);
      const newCount = (currentProgress?.correctionsCount || 0) + 1;
      const newEarnings = (parseFloat(currentProgress?.earningsToday || '0')) + reward;
      
      await this.updateWorkProgress(userId, today, newCount, newEarnings);
    }
    
    return { correct: isCorrect, reward };
  }
  
  // Account activation operations
  async getAccountStatus(userId: string): Promise<AccountStatus | undefined> {
    const [status] = await db
      .select()
      .from(accountStatus)
      .where(eq(accountStatus.userId, userId));
    return status;
  }
  
  async activateAccount(userId: string): Promise<void> {
    // Check if account was already active (to avoid duplicate commissions)
    const currentStatus = await this.getAccountStatus(userId);
    const wasAlreadyActive = currentStatus?.isActive === true;

    // Activate the account
    await db
      .insert(accountStatus)
      .values({
        userId,
        isActive: true,
        activatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: accountStatus.userId,
        set: {
          isActive: true,
          activatedAt: new Date(),
        },
      });

    // Award referral commission if this is the first activation and user was referred
    if (!wasAlreadyActive) {
      const user = await this.getUser(userId);
      if (user?.referredBy) {
        // Calculate commission: 20% of 3600 FCFA activation cost = 720 FCFA
        const activationCost = 3600;
        const commissionRate = 0.20;
        const commission = activationCost * commissionRate;

        // Update referral record with commission
        await db
          .update(referrals)
          .set({ commission: commission.toString() })
          .where(eq(referrals.referredUserId, userId));

        // Award commission to referrer
        await this.updateUserBalance(user.referredBy, commission);
      }
    }
  }

  async deactivateAccount(userId: string): Promise<void> {
    await db
      .update(accountStatus)
      .set({
        isActive: false,
        activatedAt: null,
      })
      .where(eq(accountStatus.userId, userId));
  }
  
  // Withdrawal operations
  async createWithdrawal(userId: string, amount: number, phoneNumber: string): Promise<Withdrawal> {
    const [withdrawal] = await db
      .insert(withdrawals)
      .values({
        userId,
        amount: amount.toString(),
        phoneNumber,
        status: 'pending',
      })
      .returning();
    
    return withdrawal as Withdrawal;
  }
  
  async getUserWithdrawals(userId: string): Promise<Withdrawal[]> {
    return await db
      .select()
      .from(withdrawals)
      .where(eq(withdrawals.userId, userId))
      .orderBy(desc(withdrawals.createdAt));
  }
  
  async updateWithdrawalStatus(withdrawalId: string, status: string): Promise<void> {
    await db
      .update(withdrawals)
      .set({ 
        status, 
        processedAt: status === 'completed' ? new Date() : null 
      })
      .where(eq(withdrawals.id, withdrawalId));
  }

  // Identity verification operations
  async createIdentityVerification(userId: string, frontIdPhoto: string, backIdPhoto: string, selfiePhoto: string): Promise<IdentityVerification> {
    const [verification] = await db
      .insert(identityVerification)
      .values({
        userId,
        frontIdPhotoUrl: frontIdPhoto,
        backIdPhotoUrl: backIdPhoto,
        selfiePhotoUrl: selfiePhoto,
        status: 'pending',
      })
      .returning();
    
    return verification as IdentityVerification;
  }
  
  async getUserIdentityVerification(userId: string): Promise<IdentityVerification | null> {
    const [verification] = await db
      .select()
      .from(identityVerification)
      .where(eq(identityVerification.userId, userId))
      .limit(1);
    
    return verification as IdentityVerification || null;
  }

  async getAllIdentityVerifications(): Promise<IdentityVerification[]> {
    return await db
      .select()
      .from(identityVerification)
      .orderBy(desc(identityVerification.submittedAt));
  }
  
  async updateIdentityVerificationStatus(verificationId: string, status: string, adminNotes?: string, reviewedBy?: string): Promise<void> {
    await db
      .update(identityVerification)
      .set({ 
        status,
        adminNotes,
        reviewedBy,
        reviewedAt: new Date()
      })
      .where(eq(identityVerification.id, verificationId));
  }

  // Bank card operations
  async createBankCard(userId: string, firstName: string, lastName: string, cardNumber: string, operator?: string, country?: string): Promise<BankCard> {
    // First, set all existing cards as non-default
    await db
      .update(bankCards)
      .set({ isDefault: false })
      .where(eq(bankCards.userId, userId));

    const [card] = await db
      .insert(bankCards)
      .values({
        userId,
        firstName,
        lastName,
        cardNumber,
        operator: operator || "Non spécifié",
        country: country || "+228",
        isDefault: true,
      })
      .returning();
    
    return card as BankCard;
  }
  
  async getUserBankCard(userId: string): Promise<BankCard | null> {
    const [card] = await db
      .select()
      .from(bankCards)
      .where(eq(bankCards.userId, userId))
      .orderBy(desc(bankCards.createdAt))
      .limit(1);
    
    return card as BankCard || null;
  }
  
  async getBankCardById(cardId: string): Promise<BankCard | null> {
    const [card] = await db
      .select()
      .from(bankCards)
      .where(eq(bankCards.id, cardId))
      .limit(1);
    
    return card as BankCard || null;
  }
  
  async updateBankCard(cardId: string, userId: string, firstName: string, lastName: string, cardNumber: string, operator?: string, country?: string): Promise<BankCard | null> {
    const [card] = await db
      .update(bankCards)
      .set({
        firstName,
        lastName,
        cardNumber,
        operator: operator || "Non spécifié",
        country: country || "+228",
        updatedAt: new Date(),
      })
      .where(and(eq(bankCards.id, cardId), eq(bankCards.userId, userId)))
      .returning();
    
    return card as BankCard || null;
  }
  
  async deleteBankCard(cardId: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(bankCards)
      .where(and(eq(bankCards.id, cardId), eq(bankCards.userId, userId)))
      .returning();
    
    return result.length > 0;
  }

  // Admin operations implementation
  async getTotalUsersCount(): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);
    return result.count || 0;
  }

  async getTotalDepositsCount(): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(eq(transactions.type, 'deposit'));
    return result.count || 0;
  }

  async getTotalWithdrawalsCount(): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(eq(transactions.type, 'withdrawal'));
    return result.count || 0;
  }

  async getPendingWithdrawalsCount(): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(and(
        eq(transactions.type, 'withdrawal'),
        eq(transactions.status, 'pending')
      ));
    return result.count || 0;
  }

  async getPendingDepositsCount(): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(and(
        eq(transactions.type, 'deposit'),
        eq(transactions.status, 'pending')
      ));
    return result.count || 0;
  }

  async getCompletedDepositsCount(): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(and(
        eq(transactions.type, 'deposit'),
        eq(transactions.status, 'completed')
      ));
    return result.count || 0;
  }

  async getCompletedWithdrawalsCount(): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(and(
        eq(transactions.type, 'withdrawal'),
        eq(transactions.status, 'completed')
      ));
    return result.count || 0;
  }

  async searchUsersByPhone(phone: string): Promise<(User & { isActive?: boolean })[]> {
    const result = await db
      .select({
        id: users.id,
        phone: users.phone,
        email: users.email,
        fullName: users.fullName,
        balance: users.balance,
        referralCode: users.referralCode,
        role: users.role,
        isBlocked: users.isBlocked,
        createdAt: users.createdAt,
        // Include activation status
        isActive: accountStatus.isActive,
        // Explicitly exclude password and other sensitive fields
      })
      .from(users)
      .leftJoin(accountStatus, eq(accountStatus.userId, users.id))
      .where(
        or(
          ilike(users.phone, `%${phone}%`),
          ilike(users.email, `%${phone}%`)
        )
      )
      .limit(50);
    return result as User[];
  }

  async searchUsersByPhoneOrEmail(query: string): Promise<(User & { isActive?: boolean })[]> {
    const result = await db
      .select({
        id: users.id,
        phone: users.phone,
        email: users.email,
        fullName: users.fullName,
        balance: users.balance,
        referralCode: users.referralCode,
        role: users.role,
        isBlocked: users.isBlocked,
        createdAt: users.createdAt,
        // Include activation status
        isActive: accountStatus.isActive,
        // Explicitly exclude password and other sensitive fields
      })
      .from(users)
      .leftJoin(accountStatus, eq(accountStatus.userId, users.id))
      .where(
        or(
          ilike(users.phone, `%${query}%`),
          ilike(users.email, `%${query}%`)
        )
      )
      .limit(50);
    return result as User[];
  }

  async getAllUsersWithReferrals(): Promise<(User & { referralsCount: number; isActive?: boolean })[]> {
    const result = await db
      .select({
        id: users.id,
        phone: users.phone,
        email: users.email,
        fullName: users.fullName,
        balance: users.balance,
        referralCode: users.referralCode,
        role: users.role,
        isBlocked: users.isBlocked,
        createdAt: users.createdAt,
        // Include activation status
        isActive: accountStatus.isActive,
        // Explicitly exclude password and other sensitive fields
        referralsCount: sql<number>`coalesce(count(${referrals.id}), 0)`,
      })
      .from(users)
      .leftJoin(referrals, eq(users.id, referrals.referrerId))
      .leftJoin(accountStatus, eq(accountStatus.userId, users.id))
      .groupBy(users.id, users.phone, users.email, users.fullName, users.balance, users.referralCode, users.role, users.isBlocked, users.createdAt, accountStatus.isActive)
      .orderBy(desc(users.createdAt));
    return result as (User & { referralsCount: number })[];
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));
  }

  async blockUser(userId: string, blocked: boolean): Promise<void> {
    await db
      .update(users)
      .set({ isBlocked: blocked })
      .where(eq(users.id, userId));
  }

  async deleteUser(userId: string): Promise<void> {
    // Supprimer les références liées avant de supprimer l'utilisateur
    await db.delete(transactions).where(eq(transactions.userId, userId));
    await db.delete(referrals).where(eq(referrals.referrerId, userId));
    await db.delete(referrals).where(eq(referrals.referredUserId, userId));
    await db.delete(corrections).where(eq(corrections.userId, userId));
    await db.delete(workProgress).where(eq(workProgress.userId, userId));
    await db.delete(accountStatus).where(eq(accountStatus.userId, userId));
    await db.delete(identityVerification).where(eq(identityVerification.userId, userId));
    await db.delete(withdrawals).where(eq(withdrawals.userId, userId));
    await db.delete(bankCards).where(eq(bankCards.userId, userId));
    
    // Enfin supprimer l'utilisateur
    await db.delete(users).where(eq(users.id, userId));
  }

  async getAllWithdrawals(): Promise<any[]> {
    try {
      return await db
        .select({
          id: withdrawals.id,
          amount: withdrawals.amount,
          phoneNumber: withdrawals.phoneNumber,
          status: withdrawals.status,
          createdAt: withdrawals.createdAt,
          processedAt: withdrawals.processedAt,
          userPhone: users.phone,
          userEmail: users.email,
          userFullName: users.fullName
        })
        .from(withdrawals)
        .leftJoin(users, eq(withdrawals.userId, users.id))
        .orderBy(desc(withdrawals.createdAt));
    } catch (error) {
      console.error('Error fetching all withdrawals:', error);
      return [];
    }
  }

  // App settings implementation
  async getAppSettings(): Promise<AppSetting[]> {
    const result = await db.select().from(appSettings).orderBy(appSettings.key);
    return result;
  }

  async updateAppSetting(key: string, value: string): Promise<void> {
    await db.insert(appSettings)
      .values({ key, value, label: key })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value, updatedAt: new Date() }
      });
  }

  async initializeDefaultSettings(): Promise<void> {
    const defaultSettings = [
      { key: 'activation_link', value: 'https://app.payix.me/payment/32518586-14cc-4a45-877a-758608f969aa', label: 'Lien activation en ligne' },
      { key: 'whatsapp_group', value: 'https://chat.whatsapp.com/HtUYvCOeJArHYLhMcRCsDs', label: 'Groupe WhatsApp' },
      { key: 'telegram_supervisor', value: '@SIKAcustomer_service', label: 'Superviseur Telegram' },
      { key: 'telegram_group', value: 'https://t.me/sikatexte_group', label: 'Groupe Telegram' }
    ];

    for (const setting of defaultSettings) {
      await db.insert(appSettings)
        .values(setting)
        .onConflictDoNothing();
    }
  }
}

export const storage = new DatabaseStorage();
