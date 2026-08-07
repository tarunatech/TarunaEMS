import {
  index,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const holidayTypeEnum = pgEnum('holiday_type', ['Public', 'Optional', 'Company']);

export const holidays = pgTable(
  'holidays',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    date: timestamp('date', { withTimezone: true }).notNull(),
    description: varchar('description', { length: 2048 }),
    type: holidayTypeEnum('type').notNull().default('Public'),
    createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    dateIdx: index('holidays_date_idx').on(table.date),
    dateUniqueIdx: uniqueIndex('holidays_date_unique_idx').on(table.date),
  }),
);
