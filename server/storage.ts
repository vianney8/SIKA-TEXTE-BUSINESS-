import {
  users,
  transactions,
  referrals,
  type User,
  type UpsertUser,
  type Transaction,
  type InsertTransaction,
  type Referral,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and } from "drizzle-orm";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";

export interface IStorage {
  // User operations - required for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Authentication operations
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(userData: { phone: string; fullName: string; password: string; referralCode?: string }): Promise<User>;
  validateUser(phone: string, password: string): Promise<User | null>;
  
  // Transaction operations
  createTransaction(transaction: Omit<InsertTransaction, 'id' | 'reference'>): Promise<Transaction>;
  getUserTransactions(userId: string, limit?: number, type?: string, status?: string): Promise<Transaction[]>;
  updateTransactionStatus(transactionId: string, status: string): Promise<void>;
  
  // Balance operations
  updateUserBalance(userId: string, amount: number): Promise<void>;
  getUserBalance(userId: string): Promise<number>;
  
  // Referral operations
  getReferralStats(userId: string): Promise<{ totalReferrals: number; totalCommission: number }>;
  getUserReferrals(userId: string): Promise<(Referral & { referredUser: User })[]>;
  createReferral(referrerId: string, referredUserId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations - required for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
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
    return result[0];
  }

  // Authentication operations
  async getUserByPhone(phone: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.phone, phone));
    return result[0];
  }

  async createUser(userData: { phone: string; fullName: string; password: string; referralCode?: string }): Promise<User> {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const referralCode = `STB${randomBytes(6).toString('hex').toUpperCase()}`;
    
    const result = await db
      .insert(users)
      .values({
        phone: userData.phone,
        fullName: userData.fullName,
        referralCode,
        referredBy: userData.referralCode ? 
          (await this.getUserByReferralCode(userData.referralCode))?.id : 
          undefined,
      })
      .returning();
    const user = result[0];

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

  async getUserTransactions(userId: string, limit = 50, type?: string, status?: string): Promise<Transaction[]> {
    const conditions = [eq(transactions.userId, userId)];

    // Apply filters if provided
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

  async getUserBalance(userId: string): Promise<number> {
    const [user] = await db.select({ balance: users.balance }).from(users).where(eq(users.id, userId));
    return parseFloat(user?.balance || '0');
  }

  // Referral operations
  async getReferralStats(userId: string): Promise<{ totalReferrals: number; totalCommission: number }> {
    const [stats] = await db
      .select({
        totalReferrals: sql<number>`count(*)`,
        totalCommission: sql<number>`coalesce(sum(${referrals.commission}), 0)`,
      })
      .from(referrals)
      .where(eq(referrals.referrerId, userId));

    return {
      totalReferrals: Number(stats.totalReferrals),
      totalCommission: Number(stats.totalCommission),
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
    const commission = 200; // Fixed commission for now
    
    await db.insert(referrals).values({
      referrerId,
      referredUserId,
      commission: commission.toString(),
    });

    // Add commission to referrer's balance
    await this.updateUserBalance(referrerId, commission);
  }
}

export const storage = new DatabaseStorage();
