import {
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const budgetStatusEnum = pgEnum('budget_status', [
  'Draft',
  'Pending Approval',
  'Approved',
  'Rejected',
  'Superseded',
]);

export const projectBudgets = pgTable(
  'project_budgets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('projectId').notNull(),
    budgetNumber: varchar('budgetNumber', { length: 64 }).notNull(),
    version: integer('version').notNull().default(1),
    status: budgetStatusEnum('status').notNull().default('Draft'),
    totalPlannedAmount: numeric('totalPlannedAmount', { mode: 'number' }).notNull().default(0),
    totalApprovedAmount: numeric('totalApprovedAmount', { mode: 'number' }).notNull().default(0),
    currency: varchar('currency', { length: 10 }).notNull().default('INR'),
    notes: text('notes'),
    createdBy: uuid('createdBy').notNull(),
    approvedBy: uuid('approvedBy'),
    approvedAt: timestamp('approvedAt', { withTimezone: true }),
    createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    projectIdx: index('project_budgets_projectId_idx').on(table.projectId),
    statusIdx: index('project_budgets_status_idx').on(table.status),
    budgetNumberIdx: index('project_budgets_budgetNumber_idx').on(table.budgetNumber),
    projectVersionIdx: uniqueIndex('project_budgets_project_version_unique_idx').on(table.projectId, table.version),
    createdAtIdx: index('project_budgets_createdAt_idx').on(table.createdAt),
  })
);

export const projectBudgetItems = pgTable(
  'project_budget_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    budgetId: uuid('budgetId').notNull(),
    category: varchar('category', { length: 255 }).notNull(),
    description: text('description'),
    plannedAmount: numeric('plannedAmount', { mode: 'number' }).notNull().default(0),
    approvedAmount: numeric('approvedAmount', { mode: 'number' }).notNull().default(0),
    createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    budgetIdx: index('project_budget_items_budgetId_idx').on(table.budgetId),
    categoryIdx: index('project_budget_items_category_idx').on(table.category),
  })
);
