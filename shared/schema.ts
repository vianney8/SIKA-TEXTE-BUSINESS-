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

// User storage table - required for Replit Auth
export const users: any = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
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

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  transactions: many(transactions),
  referrals: many(referrals, { relationName: "referrer" }),
  referredUsers: many(referrals, { relationName: "referred" }),
  referrer: one(users, {
    fields: [users.referredBy],
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

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;
export type Referral = typeof referrals.$inferSelect;
