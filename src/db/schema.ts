import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

export const users = sqliteTable('users', {
  uid: text('uid').primaryKey(),
  email: text('email').notNull(),
  name: text('name'),
  phoneWa: text('phone_wa'),
  passwordPlain: text('password_plain'),
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

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.uid],
  }),
}));
