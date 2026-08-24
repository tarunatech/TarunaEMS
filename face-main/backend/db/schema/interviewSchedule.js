import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const interviewModeEnum = pgEnum('interview_mode', ['Online', 'Offline', 'Telephonic']);
export const interviewStatusEnum = pgEnum('interview_status', ['Scheduled', 'Completed', 'Selected', 'Rejected', 'Cancelled']);

export const interviewSchedules = pgTable(
  'interviewSchedules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    candidateName: varchar('candidateName', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 64 }).notNull(),
    resumeUrl: varchar('resumeUrl', { length: 1024 }),
    resumeFile: jsonb('resumeFile').notNull(),
    education: jsonb('education').notNull().default([]),
    experienceHistory: jsonb('experienceHistory').notNull().default([]),
    certifications: jsonb('certifications').notNull().default([]),
    documents: jsonb('documents').notNull().default([]),
    position: varchar('position', { length: 255 }).notNull(),
    experience: varchar('experience', { length: 255 }).notNull(),
    interviewDate: timestamp('interviewDate', { withTimezone: true }).notNull(),
    interviewTime: varchar('interviewTime', { length: 64 }).notNull(),
    interviewMode: interviewModeEnum('interviewMode').notNull(),
    interviewRound: varchar('interviewRound', { length: 255 }).notNull(),
    skills: varchar('skills', { length: 2048 }).notNull(),
    notes: varchar('notes', { length: 4096 }).notNull(),
    status: interviewStatusEnum('status').notNull().default('Scheduled'),
    createdBy: uuid('createdBy').notNull(),
    createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    interviewDateTimeIdx: index('interviewSchedules_date_time_idx').on(table.interviewDate, table.interviewTime),
    createdByCreatedAtIdx: index('interviewSchedules_createdBy_createdAt_idx').on(table.createdBy, table.createdAt),
  }),
);
