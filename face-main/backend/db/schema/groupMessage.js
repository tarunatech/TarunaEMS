import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const groupMessageTypeEnum = pgEnum('group_message_type', ['text', 'system']);

export const groupMessages = pgTable(
  'group_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    group: uuid('group').notNull(),
    sender: uuid('sender').notNull(),
    text: varchar('text', { length: 5000 }).notNull(),
    type: groupMessageTypeEnum('type').notNull().default('text'),
    readBy: jsonb('readBy').notNull().default([]),
    isDeleted: boolean('isDeleted').notNull().default(false),
    createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    groupCreatedAtIdx: index('group_messages_group_createdAt_idx').on(table.group, table.createdAt),
    senderIdx: index('group_messages_sender_idx').on(table.sender),
  }),
);
