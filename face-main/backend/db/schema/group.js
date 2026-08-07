import {
  boolean,
  index,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const groups = pgTable(
  'groups',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    description: varchar('description', { length: 500 }).notNull().default(''),
    avatar: varchar('avatar', { length: 1024 }),
    owner: uuid('owner').notNull(),
    members: jsonb('members').notNull().default([]),
    settings: jsonb('settings').notNull().default({}),
    isActive: boolean('isActive').notNull().default(true),
    lastMessage: jsonb('lastMessage').default({}),
    createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ownerIdx: index('groups_owner_idx').on(table.owner),
    isActiveIdx: index('groups_isActive_idx').on(table.isActive),
    updatedAtIdx: index('groups_updatedAt_idx').on(table.updatedAt),
  }),
);
