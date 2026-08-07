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

export const notificationTypeEnum = pgEnum('notification_type', ['info', 'success', 'warning', 'error']);
export const notificationCategoryEnum = pgEnum('notification_category', ['attendance', 'leave', 'task', 'employee', 'system']);
export const notificationPriorityEnum = pgEnum('notification_priority', ['low', 'medium', 'high', 'urgent']);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    message: varchar('message', { length: 4096 }).notNull(),
    type: notificationTypeEnum('type').notNull().default('info'),
    category: notificationCategoryEnum('category').notNull(),
    targetUsers: jsonb('targetUsers').notNull().default([]),
    sender: uuid('sender').notNull(),
    relatedEntity: jsonb('relatedEntity').default({}),
    isRead: boolean('isRead').notNull().default(false),
    readBy: jsonb('readBy').notNull().default([]),
    priority: notificationPriorityEnum('priority').notNull().default('medium'),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    isReadIdx: index('notifications_isRead_idx').on(table.isRead),
    categoryTypeIdx: index('notifications_category_type_idx').on(table.category, table.type),
    senderIdx: index('notifications_sender_idx').on(table.sender),
    createdAtIdx: index('notifications_createdAt_idx').on(table.createdAt),
  }),
);
