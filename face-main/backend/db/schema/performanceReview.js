import {
  index,
  integer,
  numeric,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const performanceReviews = pgTable(
  'performance_reviews',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    employeeId: uuid('employeeId').notNull(),
    month: varchar('month', { length: 7 }).notNull(),
    totalTasks: integer('totalTasks').notNull().default(0),
    onTimeCount: integer('onTimeCount').notNull().default(0),
    lateCount: integer('lateCount').notNull().default(0),
    autoScore: numeric('autoScore', { mode: 'number' }).notNull().default(0),
    suggestedRating: integer('suggestedRating').notNull().default(0),
    adminRating: integer('adminRating'),
    adminComment: varchar('adminComment', { length: 1000 }),
    ratedBy: uuid('ratedBy'),
    ratedAt: timestamp('ratedAt', { withTimezone: true }),
    createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    employeeIdIdx: index('performance_reviews_employeeId_idx').on(table.employeeId),
    monthIdx: index('performance_reviews_month_idx').on(table.month),
    // Intentional lookup index for one review row per employee/month; no DB unique constraint.
    employeeMonthIdx: index('performance_reviews_employee_month_idx').on(table.employeeId, table.month),
  }),
);
