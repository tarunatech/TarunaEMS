import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const dayBookStatusEnum = pgEnum('day_book_status', ['Pending', 'Draft', 'Submitted', 'Approved', 'Rejected']);

export const dayBooks = pgTable(
  'dayBooks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    employee: uuid('employee').notNull(),
    date: timestamp('date', { withTimezone: true }).notNull().defaultNow(),
    slots: jsonb('slots').notNull().default([]),
    status: dayBookStatusEnum('status').notNull().default('Draft'),
    adminComment: varchar('adminComment', { length: 2048 }),
    createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    employeeIdx: index('dayBooks_employee_idx').on(table.employee),
    dateIdx: index('dayBooks_date_idx').on(table.date),
    employeeDateUniqueIdx: uniqueIndex('dayBooks_employee_date_unique_idx').on(table.employee, table.date),
  }),
);
