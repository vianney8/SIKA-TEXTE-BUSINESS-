import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  decimal,
  integer,
  boolean,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table
export const users: any = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  password: varchar("password"), // Pour l'authentification simple
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  phone: varchar("phone").unique(),
  fullName: varchar("full_name"),
  balance: decimal("balance", { precision: 15, scale: 2 }).default('0'),
  referralCode: varchar("referral_code").unique(),
  referredBy: varchar("referred_by").references((): any => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: varchar("type").notNull(), // 'transfer', 'recharge', 'payment', 'deposit', 'withdrawal'
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  recipientPhone: varchar("recipient_phone"),
  merchantCode: varchar("merchant_code"),
  operator: varchar("operator"),
  description: text("description"),
  status: varchar("status").notNull().default('pending'), // 'pending', 'completed', 'failed'
  reference: varchar("reference").unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id").notNull().references(() => users.id),
  referredUserId: varchar("referred_user_id").notNull().references(() => users.id),
  commission: decimal("commission", { precision: 15, scale: 2 }).default('0'),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tables pour SIKA TEXTE BUSINESS
export const sentences = pgTable("sentences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  text: text("text").notNull(),
  correctedText: text("corrected_text").notNull(),
  errorCount: integer("error_count").notNull().default(1),
  difficulty: varchar("difficulty").notNull().default('easy'), // 'easy', 'medium', 'hard'
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const workProgress = pgTable("work_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  date: varchar("date").notNull(), // Format YYYY-MM-DD
  correctionsCount: integer("corrections_count").notNull().default(0),
  earningsToday: decimal("earnings_today", { precision: 15, scale: 2 }).default('0'),
  lastCorrectionAt: timestamp("last_correction_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Unique constraint to ensure one progress record per user per day
  userDateUnique: unique().on(table.userId, table.date),
}));

export const corrections = pgTable("corrections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  sentenceId: varchar("sentence_id").notNull().references(() => sentences.id),
  userAnswer: text("user_answer").notNull(),
  isCorrect: boolean("is_correct").notNull(),
  earnedAmount: decimal("earned_amount", { precision: 15, scale: 2 }).default('0'),
  completedAt: timestamp("completed_at").defaultNow(),
});

export const accountStatus = pgTable("account_status", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  isActive: boolean("is_active").notNull().default(false),
  activatedAt: timestamp("activated_at"),
  activationFee: decimal("activation_fee", { precision: 15, scale: 2 }).default('3600'),
  createdAt: timestamp("created_at").defaultNow(),
});

export const withdrawals = pgTable("withdrawals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  phoneNumber: varchar("phone_number").notNull(),
  status: varchar("status").notNull().default('pending'), // 'pending', 'completed', 'failed'
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const identityVerification = pgTable("identity_verification", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  frontIdPhotoUrl: varchar("front_id_photo_url"),
  backIdPhotoUrl: varchar("back_id_photo_url"),
  selfiePhotoUrl: varchar("selfie_photo_url"),
  status: varchar("status").notNull().default('pending'), // 'pending', 'approved', 'rejected'
  adminNotes: text("admin_notes"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by"),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  transactions: many(transactions),
  referrals: many(referrals, { relationName: "referrer" }),
  referredUsers: many(referrals, { relationName: "referred" }),
  referrer: one(users, {
    fields: [users.referredBy],
    references: [users.id],
  }),
  workProgress: many(workProgress),
  corrections: many(corrections),
  accountStatus: one(accountStatus),
  withdrawals: many(withdrawals),
  identityVerification: one(identityVerification),
}));

export const workProgressRelations = relations(workProgress, ({ one }) => ({
  user: one(users, {
    fields: [workProgress.userId],
    references: [users.id],
  }),
}));

export const correctionsRelations = relations(corrections, ({ one }) => ({
  user: one(users, {
    fields: [corrections.userId],
    references: [users.id],
  }),
  sentence: one(sentences, {
    fields: [corrections.sentenceId],
    references: [sentences.id],
  }),
}));

export const accountStatusRelations = relations(accountStatus, ({ one }) => ({
  user: one(users, {
    fields: [accountStatus.userId],
    references: [users.id],
  }),
}));

export const withdrawalsRelations = relations(withdrawals, ({ one }) => ({
  user: one(users, {
    fields: [withdrawals.userId],
    references: [users.id],
  }),
}));

export const identityVerificationRelations = relations(identityVerification, ({ one }) => ({
  user: one(users, {
    fields: [identityVerification.userId],
    references: [users.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
}));

export const referralsRelations = relations(referrals, ({ one }) => ({
  referrer: one(users, {
    fields: [referrals.referrerId],
    references: [users.id],
    relationName: "referrer",
  }),
  referredUser: one(users, {
    fields: [referrals.referredUserId],
    references: [users.id],
    relationName: "referred",
  }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users).pick({
  phone: true,
  fullName: true,
});

export const registerUserSchema = z.object({
  phone: z.string().min(1, "Le numéro de téléphone est requis"),
  fullName: z.string().min(1, "Le nom complet est requis"),
  password: z.string().min(4, "Le mot de passe doit contenir au moins 4 caractères"),
  confirmPassword: z.string(),
  terms: z.boolean().refine(val => val === true, "Vous devez accepter les conditions"),
}).refine(data => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

export const loginUserSchema = z.object({
  phone: z.string().min(1, "Le numéro de téléphone est requis"),
  password: z.string().min(1, "Le mot de passe est requis"),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  userId: true,
  reference: true,
  createdAt: true,
});

export const transferSchema = z.object({
  recipientPhone: z.string().min(1, "Le numéro du destinataire est requis"),
  amount: z.number().min(100, "Le montant minimum est 100 F.CFA"),
  message: z.string().optional(),
});

export const rechargeSchema = z.object({
  operator: z.string().min(1, "L'opérateur est requis"),
  phone: z.string().min(1, "Le numéro de téléphone est requis"),
  amount: z.number().min(100, "Le montant minimum est 100 F.CFA"),
});

export const paymentSchema = z.object({
  merchantCode: z.string().min(1, "Le code marchand est requis"),
  amount: z.number().min(100, "Le montant minimum est 100 F.CFA"),
  description: z.string().optional(),
});

// Schémas pour l'authentification simple
export const simpleRegisterSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom de famille est requis"),
  phoneNumber: z.string().min(8, "Le numéro de téléphone est requis"),
});

export const simpleLoginSchema = z.object({
  phoneNumber: z.string().min(8, "Le numéro de téléphone est requis"),
  password: z.string().min(1, "Le mot de passe est requis"),
});

export type SimpleRegister = z.infer<typeof simpleRegisterSchema>;
export type SimpleLogin = z.infer<typeof simpleLoginSchema>;

// Schémas pour les nouvelles fonctionnalités
export const workSubmissionSchema = z.object({
  sentenceId: z.string().min(1, "ID de phrase requis"),
  answer: z.string().min(1, "Réponse requise"),
});

export const withdrawalRequestSchema = z.object({
  amount: z.number().min(3500, "Montant minimum 3500 FCFA"),
  phoneNumber: z.string().min(1, "Numéro de téléphone requis"),
});

export const identityVerificationSchema = z.object({
  frontIdPhoto: z.string().min(1, "Photo recto de la pièce d'identité requise"),
  backIdPhoto: z.string().min(1, "Photo verso de la pièce d'identité requise"),
  selfiePhoto: z.string().min(1, "Photo selfie requise"),
});

export const activationSchema = z.object({
  activationFee: z.number().min(3600, "Frais d'activation de 3600 FCFA requis"),
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;
export type Referral = typeof referrals.$inferSelect;
export type Sentence = typeof sentences.$inferSelect;
export type WorkProgress = typeof workProgress.$inferSelect;
export type Correction = typeof corrections.$inferSelect;
export type AccountStatus = typeof accountStatus.$inferSelect;
export type Withdrawal = typeof withdrawals.$inferSelect;
export type IdentityVerification = typeof identityVerification.$inferSelect;
export type WorkSubmission = z.infer<typeof workSubmissionSchema>;
export type WithdrawalRequest = z.infer<typeof withdrawalRequestSchema>;
export type ActivationRequest = z.infer<typeof activationSchema>;
export type IdentityVerificationRequest = z.infer<typeof identityVerificationSchema>;
