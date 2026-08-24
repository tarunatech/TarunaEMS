import {
  index,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const problemStatusEnum = pgEnum('problem_status', ['Pending', 'Solved']);

export const problems = pgTable(
  'problems',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    description: varchar('description', { length: 4096 }).notNull(),
    reportedBy: uuid('reportedBy').notNull(),
    assignedTo: uuid('assignedTo'),
    solvedBy: uuid('solvedBy'),
    status: problemStatusEnum('status').notNull().default('Pending'),
    solvedAt: timestamp('solvedAt', { withTimezone: true }),
    createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    statusIdx: index('problems_status_idx').on(table.status),
    reportedByIdx: index('problems_reportedBy_idx').on(table.reportedBy),
    assignedToIdx: index('problems_assignedTo_idx').on(table.assignedTo),
    createdAtIdx: index('problems_createdAt_idx').on(table.createdAt),
  }),
);
