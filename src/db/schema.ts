import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

export const users = sqliteTable('users', {
  uid: text('uid').primaryKey(),
  email: text('email').notNull(),
  name: text('name'),
  phoneWa: text('phone_wa'),
  passwordPlain: text('password_plain'),
  passwordHash: text('password_hash'),
  tokenVersion: integer('token_version').default(0),
  role: text('role').default('user'),
  credits: integer('credits').default(0),
  statusAktif: integer('status_aktif', { mode: 'boolean' }).default(false),
  packageTier: text('package_tier'),
  createdAt: text('created_at'),
});

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.uid).notNull(),
  title: text('title').notNull(),
  status: text('status'),
  videoType: text('video_type'),
  finalVideoUrl: text('final_video_url'),
  showcaseEligible: integer('showcase_eligible', { mode: 'boolean' }).default(false),
  showcaseOrder: integer('showcase_order'),
  data: text('data'),
  createdAt: text('created_at'),
});

export const creditHolds = sqliteTable('credit_holds', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.uid).notNull(),
  idempotencyKey: text('idempotency_key').notNull(),
  generationId: text('generation_id'),
  amount: integer('amount').notNull(),
  provider: text('provider'),
  model: text('model'),
  operation: text('operation'),
  status: text('status').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => ({
  userIdempotencyIdx: uniqueIndex('user_idempotency_idx').on(table.userId, table.idempotencyKey)
}));

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  creditHolds: many(creditHolds),
}));

export const projectsRelations = relations(projects, ({ one }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.uid],
  }),
}));

export const apiKeys = sqliteTable('api_keys', {
  id: text('id').primaryKey(),
  provider: text('provider').notNull(),
  keyEncrypted: text('key_encrypted').notNull(),
  maskedKey: text('masked_key').notNull(),
  status: text('status').default('ACTIVE'),
  cooldownUntil: integer('cooldown_until'),
  totalRequests: integer('total_requests').default(0),
  totalErrors: integer('total_errors').default(0),
  lastUsedAt: text('last_used_at'),
  lastErrorReason: text('last_error_reason'),
  createdAt: text('created_at'),
  updatedAt: text('updated_at'),
});

export const systemSettings = sqliteTable('system_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at'),
});
