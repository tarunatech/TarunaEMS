import {
  integer,
  jsonb,
  numeric,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const departments = pgTable(
  'departments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 64 }).notNull(),
    description: varchar('description', { length: 2048 }).default(''),
    manager: varchar('manager', { length: 255 }).default(''),
    location: varchar('location', { length: 255 }).default(''),
    budget: numeric('budget', { precision: 14, scale: 2 }).notNull().default('0'),
    status: varchar('status', { length: 32 }).notNull().default('Active'),
    establishedDate: timestamp('establishedDate').notNull().defaultNow(),
    goals: jsonb('goals').notNull().default([]),
    parentDepartment: uuid('parentDepartment'),
    employeeCount: integer('employeeCount').notNull().default(0),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    nameUniqueIdx: uniqueIndex('departments_name_unique_idx').on(table.name),
    codeUniqueIdx: uniqueIndex('departments_code_unique_idx').on(table.code),
  }),
);
