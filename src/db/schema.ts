import { integer, pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  uid: text('uid').primaryKey(),
  email: text('email').notNull(),
  name: text('name'),
  phoneWa: text('phone_wa'),
  passwordPlain: text('password_plain'),
  role: text('role').default('user'),
  credits: integer('credits').default(0),
  statusAktif: boolean('status_aktif').default(false),
  packageTier: text('package_tier'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.uid).notNull(),
  title: text('title').notNull(),
  status: text('status'),
  videoType: text('video_type'),
  finalVideoUrl: text('final_video_url'),
  data: text('data'), // JSON string representing the full project
  createdAt: timestamp('created_at').defaultNow(),
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
