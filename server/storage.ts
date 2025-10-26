import {
  users,
  sessions,
  transactions,
  referrals,
  sentences,
  workProgress,
  corrections,
  userSentenceAssignments,
  accountStatus,
  withdrawals,
  identityVerification,
  bankCards,
  appSettings,
  notifications,
  type User,
  type UpsertUser,
  type Transaction,
  type InsertTransaction,
  type Referral,
  type Sentence,
  type WorkProgress,
  type Correction,
  type UserSentenceAssignment,
  type InsertUserSentenceAssignment,
  type AccountStatus,
  type Withdrawal,
  type IdentityVerification,
  type BankCard,
  type InsertBankCard,
  type AppSetting,
  type InsertAppSetting,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, inArray, like, ilike, or, notInArray } from "drizzle-orm";
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
  getDailySentences(userId: string, limit?: number): Promise<(Sentence & { assignedDate: string })[]>;
  submitCorrection(userId: string, sentenceId: string, userAnswer: string): Promise<{ correct: boolean; reward: number }>;
  
  // Account activation operations
  getAccountStatus(userId: string): Promise<AccountStatus | undefined>;
  activateAccount(userId: string): Promise<void>;
  deactivateAccount(userId: string): Promise<void>;
  
  // Withdrawal operations
  createWithdrawal(userId: string, amount: number, phoneNumber: string, cardFirstName?: string, cardLastName?: string, cardNumber?: string): Promise<Withdrawal>;
  getUserWithdrawals(userId: string): Promise<Withdrawal[]>;
  getWithdrawalById(withdrawalId: string): Promise<Withdrawal | undefined>;
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

  // Notifications
  getUserNotifications(userId: string): Promise<any[]>;
  createNotification(userId: string, message: string): Promise<any>;
  markNotificationSeen(notificationId: string): Promise<void>;
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

  async getDailySentences(userId: string, limit = 12): Promise<(Sentence & { assignedDate: string })[]> {
    const today = this.getCurrentDate();
    
    // First, get existing assignments for today
    const existingAssignments = await db
      .select({
        sentence: sentences,
        assignedDate: userSentenceAssignments.assignedDate
      })
      .from(userSentenceAssignments)
      .innerJoin(sentences, eq(userSentenceAssignments.sentenceId, sentences.id))
      .where(
        and(
          eq(userSentenceAssignments.userId, userId),
          eq(userSentenceAssignments.assignedDate, today)
        )
      )
      .limit(limit);

    // If we already have enough assignments for today, return them
    if (existingAssignments.length >= limit) {
      return existingAssignments.map(a => ({ ...a.sentence, assignedDate: a.assignedDate }));
    }

    // We need more sentences - find new ones not seen by this user before
    // Get ALL sentence IDs already assigned to this user (ever)
    const alreadyAssignedIds = await db
      .select({ sentenceId: userSentenceAssignments.sentenceId })
      .from(userSentenceAssignments)
      .where(eq(userSentenceAssignments.userId, userId));

    const excludedIds = alreadyAssignedIds.map(a => a.sentenceId);
    
    // Find new sentences not in excluded list
    const neededCount = limit - existingAssignments.length;
    let candidateSentences: Sentence[];
    
    if (excludedIds.length > 0) {
      candidateSentences = await db
        .select()
        .from(sentences)
        .where(
          and(
            eq(sentences.isActive, true),
            notInArray(sentences.id, excludedIds)
          )
        )
        .limit(neededCount);
    } else {
      candidateSentences = await db
        .select()
        .from(sentences)
        .where(eq(sentences.isActive, true))
        .limit(neededCount);
    }

    // If we don't have enough new sentences, user has seen all available sentences
    // Fall back to least recently assigned sentences (oldest first)
    if (candidateSentences.length < neededCount) {
      // Ensure we have enough sentences in the database
      await this.ensureSufficientSentences();
      
      // Get least recently assigned sentences for this user (oldest assignments first)
      const oldestAssignments = await db
        .select({ 
          sentence: sentences,
          assignedDate: userSentenceAssignments.assignedDate 
        })
        .from(userSentenceAssignments)
        .innerJoin(sentences, eq(userSentenceAssignments.sentenceId, sentences.id))
        .where(
          and(
            eq(userSentenceAssignments.userId, userId),
            eq(sentences.isActive, true)
          )
        )
        .orderBy(userSentenceAssignments.assignedDate) // oldest assignments first
        .limit(neededCount);
      
      candidateSentences = oldestAssignments.map(a => a.sentence);
    }

    // Create assignments for new sentences
    if (candidateSentences.length > 0) {
      const newAssignments = candidateSentences.map(sentence => ({
        userId,
        sentenceId: sentence.id,
        assignedDate: today,
      }));

      await db.insert(userSentenceAssignments).values(newAssignments);
    }

    // Return all sentences for today
    const allTodayAssignments = await db
      .select({ 
        sentence: sentences,
        assignedDate: userSentenceAssignments.assignedDate
      })
      .from(userSentenceAssignments)
      .innerJoin(sentences, eq(userSentenceAssignments.sentenceId, sentences.id))
      .where(
        and(
          eq(userSentenceAssignments.userId, userId),
          eq(userSentenceAssignments.assignedDate, today)
        )
      )
      .limit(limit);

    return allTodayAssignments.map(a => ({ ...a.sentence, assignedDate: a.assignedDate }));
  }

  private async ensureSufficientSentences(): Promise<void> {
    // Check if we have enough sentences in the database
    const count = await db.select({ count: sql<number>`count(*)` }).from(sentences);
    
    if (Number(count[0].count) < 50) { // Ensure we have at least 50 sentences for rotation
      await this.createAdditionalSentences();
    }
  }

  private async createAdditionalSentences(): Promise<void> {
    // Add more sentences to ensure sufficient variety for daily assignments
    const additionalSentences = [
      {
        text: "Le soleil brilles dans le ciel bleu sans nuage aujourd'hui.",
        correctedText: "Le soleil brille dans le ciel bleu sans nuage aujourd'hui.",
        errorCount: 1
      },
      {
        text: "Mes parents travaille dur pour nous offrir une meilleure vie.",
        correctedText: "Mes parents travaillent dur pour nous offrir une meilleure vie.",
        errorCount: 1
      },
      {
        text: "La musique africaine tradition est très riche et variée.",
        correctedText: "La musique africaine traditionnelle est très riche et variée.",
        errorCount: 1
      },
      {
        text: "Les fermiers cultivent le mais, le mil et l'arachide.",
        correctedText: "Les fermiers cultivent le maïs, le mil et l'arachide.",
        errorCount: 1
      },
      {
        text: "Notre village organize une fête culturelle chaque année.",
        correctedText: "Notre village organise une fête culturelle chaque année.",
        errorCount: 1
      },
      {
        text: "Les technologies moderne transforment notre façon de vivre.",
        correctedText: "Les technologies modernes transforment notre façon de vivre.",
        errorCount: 1
      },
      {
        text: "L'éducation est la clé du développement économiques durable.",
        correctedText: "L'éducation est la clé du développement économique durable.",
        errorCount: 1
      },
      {
        text: "Les jeunes entrepreneurs créent des entreprise innovantes.",
        correctedText: "Les jeunes entrepreneurs créent des entreprises innovantes.",
        errorCount: 1
      },
      {
        text: "Il faut protéger l'environnement pour les générations futures.",
        correctedText: "Il faut protéger l'environnement pour les générations futures.",
        errorCount: 0
      },
      {
        text: "La culture africaine influence la mode et l'art mondial.",
        correctedText: "La culture africaine influence la mode et l'art mondial.",
        errorCount: 0
      }
    ];

    await db.insert(sentences).values(additionalSentences);
  }
  
  async submitCorrection(userId: string, sentenceId: string, userAnswer: string): Promise<{ correct: boolean; reward: number }> {
    // Get the sentence
    const [sentence] = await db.select().from(sentences).where(eq(sentences.id, sentenceId));
    if (!sentence) {
      throw new Error('Phrase non trouvée');
    }
    
    // Normalize text: remove punctuation, lowercase, trim
    const normalizeText = (text: string): string => {
      return text.toLowerCase().trim().replace(/[.!?;,]+$/, '').replace(/['']/g, "'").trim();
    };
    
    const userNormalized = normalizeText(userAnswer);
    const correctNormalized = normalizeText(sentence.correctedText);
    const originalNormalized = normalizeText(sentence.text);
    
    // Find the corrected word(s) by comparing original and correct sentences
    const originalWords = originalNormalized.split(/\s+/);
    const correctWords = correctNormalized.split(/\s+/);
    const correctedParts: string[] = [];
    
    // Identify what changed between original and correct
    for (let i = 0; i < Math.max(originalWords.length, correctWords.length); i++) {
      if (originalWords[i] !== correctWords[i] && correctWords[i]) {
        correctedParts.push(correctWords[i]);
      }
    }
    
    let isCorrect = false;
    
    // Strategy 1: Full correct sentence match
    if (userNormalized === correctNormalized) {
      isCorrect = true;
    } 
    // Strategy 2: User provided just the corrected word(s)
    else if (correctedParts.length > 0 && correctedParts.some(part => userNormalized.includes(part))) {
      isCorrect = true;
    }
    // Strategy 3: User's answer contains all the corrected parts
    else if (correctedParts.length > 0 && correctedParts.every(part => userNormalized.includes(part))) {
      isCorrect = true;
    }
    // Strategy 4: Any partial match with correct text (at least 3 chars)
    else if (correctNormalized.includes(userNormalized) && userNormalized.length >= 3) {
      isCorrect = true;
    }
    
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
    console.log('[STORAGE] Activating account for userId:', userId);
    // Check if account was already active (to avoid duplicate commissions)
    const currentStatus = await this.getAccountStatus(userId);
    const wasAlreadyActive = currentStatus?.isActive === true;
    console.log('[STORAGE] Current status:', currentStatus, 'Was already active:', wasAlreadyActive);

    // Activate the account
    const result = await db
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
      })
      .returning();
    
    console.log('[STORAGE] Account activation result:', result);

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
    console.log('[STORAGE] Deactivating account for userId:', userId);
    const result = await db
      .update(accountStatus)
      .set({
        isActive: false,
        activatedAt: null,
      })
      .where(eq(accountStatus.userId, userId))
      .returning();
    console.log('[STORAGE] Account deactivation result:', result);
  }
  
  // Withdrawal operations
  async createWithdrawal(userId: string, amount: number, phoneNumber: string, cardFirstName?: string, cardLastName?: string, cardNumber?: string): Promise<Withdrawal> {
    const [withdrawal] = await db
      .insert(withdrawals)
      .values({
        userId,
        amount: amount.toString(),
        phoneNumber,
        cardFirstName,
        cardLastName,
        cardNumber,
        status: 'pending',
      })
      .returning();
    
    return withdrawal as Withdrawal;
  }
  
  async getUserWithdrawals(userId: string): Promise<any[]> {
    const result = await db
      .select({
        id: withdrawals.id,
        userId: withdrawals.userId,
        amount: withdrawals.amount,
        phoneNumber: withdrawals.phoneNumber,
        cardFirstName: withdrawals.cardFirstName,
        cardLastName: withdrawals.cardLastName,
        cardNumber: withdrawals.cardNumber,
        status: withdrawals.status,
        date: withdrawals.createdAt,
        userPhone: users.phone,
      })
      .from(withdrawals)
      .leftJoin(users, eq(withdrawals.userId, users.id))
      .where(eq(withdrawals.userId, userId))
      .orderBy(desc(withdrawals.createdAt));
    
    // Display the bank card number if it exists, otherwise the phoneNumber
    return result.map(w => ({
      ...w,
      phoneNumber: w.cardNumber || w.phoneNumber
    }));
  }
  
  async getWithdrawalById(withdrawalId: string): Promise<Withdrawal | undefined> {
    const [withdrawal] = await db
      .select()
      .from(withdrawals)
      .where(eq(withdrawals.id, withdrawalId))
      .limit(1);
    return withdrawal as Withdrawal | undefined;
  }
  
  async updateWithdrawalStatus(withdrawalId: string, status: string): Promise<void> {
    console.log('[STORAGE] Updating withdrawal status:', withdrawalId, 'to', status);
    // Get the withdrawal to find the userId and amount
    const [withdrawal] = await db
      .select()
      .from(withdrawals)
      .where(eq(withdrawals.id, withdrawalId))
      .limit(1);
    
    if (!withdrawal) {
      console.error('[STORAGE] Withdrawal not found:', withdrawalId);
      throw new Error('Withdrawal not found');
    }
    
    console.log('[STORAGE] Found withdrawal:', withdrawal);
    
    // Update withdrawal status
    const withdrawalUpdate = await db
      .update(withdrawals)
      .set({ 
        status, 
        processedAt: status === 'completed' ? new Date() : null 
      })
      .where(eq(withdrawals.id, withdrawalId))
      .returning();
    
    console.log('[STORAGE] Withdrawal update result:', withdrawalUpdate);
    
    // Update the corresponding transaction status - find by userId, type, amount, and current pending status
    const transactionUpdate = await db
      .update(transactions)
      .set({ status })
      .where(
        and(
          eq(transactions.userId, withdrawal.userId),
          eq(transactions.type, 'withdrawal'),
          eq(transactions.amount, withdrawal.amount),
          eq(transactions.status, 'pending')
        )
      )
      .returning();
    
    console.log('[STORAGE] Transaction update result:', transactionUpdate);
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

  async getPendingWithdrawalsList(): Promise<any[]> {
    return await db
      .select({
        id: withdrawals.id,
        userId: withdrawals.userId,
        amount: withdrawals.amount,
        status: withdrawals.status,
        createdAt: withdrawals.createdAt,
        userPhone: users.phone,
        userFullName: users.fullName,
        bankCardId: bankCards.id,
        bankCardFirstName: bankCards.firstName,
        bankCardLastName: bankCards.lastName,
        bankCardNumber: bankCards.cardNumber
      })
      .from(withdrawals)
      .leftJoin(users, eq(withdrawals.userId, users.id))
      .leftJoin(bankCards, and(eq(bankCards.userId, withdrawals.userId), eq(bankCards.isDefault, true)))
      .where(eq(withdrawals.status, 'pending'))
      .orderBy(desc(withdrawals.createdAt));
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
        // Include activation status (default to true if no status record exists)
        isActive: sql<boolean>`coalesce(${accountStatus.isActive}, true)`,
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
    // Normaliser le numéro de recherche (retirer les caractères non-numériques)
    const normalizedQuery = query.replace(/[^0-9]/g, '');
    
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
        // Include activation status (default to true if no status record exists)
        isActive: sql<boolean>`coalesce(${accountStatus.isActive}, true)`,
        // Explicitly exclude password and other sensitive fields
      })
      .from(users)
      .leftJoin(accountStatus, eq(accountStatus.userId, users.id))
      .where(
        or(
          // Recherche par email (normale)
          ilike(users.email, `%${query}%`),
          // Recherche par téléphone (normale pour capturer les formats variés)
          ilike(users.phone, `%${query}%`),
          // Recherche par téléphone normalisé (retire tous les caractères non-numériques)
          sql`regexp_replace(${users.phone}, '[^0-9]', '', 'g') LIKE ${`%${normalizedQuery}%`}`
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
        // Include activation status (default to true if no status record exists)
        isActive: sql<boolean>`coalesce(${accountStatus.isActive}, true)`,
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

  async getOnlineUsers(): Promise<(User & { lastActivity: Date })[]> {
    // Get active sessions (expire_at > now)
    const result = await db.execute(sql`
      SELECT DISTINCT u.id, u.phone, u.email, u.full_name, u.balance, u.referral_code, u.role, 
             MAX(s.expire) as last_activity
      FROM users u
      INNER JOIN sessions s ON s.sess::jsonb->>'userId' = u.id
      WHERE s.expire > NOW()
      GROUP BY u.id, u.phone, u.email, u.full_name, u.balance, u.referral_code, u.role
      ORDER BY MAX(s.expire) DESC
    `);
    
    return (result.rows || []).map((row: any) => ({
      id: row.id,
      phone: row.phone,
      email: row.email,
      fullName: row.full_name,
      balance: row.balance,
      referralCode: row.referral_code,
      role: row.role,
      lastActivity: row.last_activity,
    })) as (User & { lastActivity: Date })[];
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
    // Supprimer toutes les références liées avant de supprimer l'utilisateur
    await db.delete(userSentenceAssignments).where(eq(userSentenceAssignments.userId, userId));
    await db.delete(transactions).where(eq(transactions.userId, userId));
    await db.delete(referrals).where(eq(referrals.referrerId, userId));
    await db.delete(referrals).where(eq(referrals.referredUserId, userId));
    await db.delete(corrections).where(eq(corrections.userId, userId));
    await db.delete(workProgress).where(eq(workProgress.userId, userId));
    await db.delete(accountStatus).where(eq(accountStatus.userId, userId));
    await db.delete(identityVerification).where(eq(identityVerification.userId, userId));
    await db.delete(withdrawals).where(eq(withdrawals.userId, userId));
    await db.delete(bankCards).where(eq(bankCards.userId, userId));
    await db.delete(sessions).where(sql`(sess->>'userId')::text = ${userId}`);
    
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
      { key: 'telegram_group', value: 'https://t.me/+A1QL2HAVBkMyMDA0', label: 'Groupe Telegram' }
    ];

    for (const setting of defaultSettings) {
      await db.insert(appSettings)
        .values(setting)
        .onConflictDoNothing();
    }
  }

  async getUserNotifications(userId: string): Promise<any[]> {
    const result = await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
    return result;
  }

  async createNotification(userId: string, message: string): Promise<any> {
    const result = await db.insert(notifications).values({
      userId,
      message,
      isRead: false
    }).returning();
    return result[0];
  }

  async markNotificationSeen(notificationId: string): Promise<void> {
    await db.update(notifications)
      .set({ seenAt: new Date() })
      .where(eq(notifications.id, notificationId));
  }
}

export const storage = new DatabaseStorage();
