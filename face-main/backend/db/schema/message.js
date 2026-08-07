import {
  boolean,
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    from: uuid('from'),
    to: uuid('to').notNull(),
    text: varchar('text', { length: 5000 }).notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
    fromBot: boolean('fromBot').notNull().default(false),
    createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    fromToTimestampIdx: index('messages_from_to_timestamp_idx').on(table.from, table.to, table.timestamp),
    toFromTimestampIdx: index('messages_to_from_timestamp_idx').on(table.to, table.from, table.timestamp),
  }),
);
