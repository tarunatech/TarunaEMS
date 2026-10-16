import {
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const projectStatusEnum = pgEnum('project_status', [
  'Planning',
  'Active',
  'On Hold',
  'Completed',
  'Cancelled',
]);

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectCode: varchar('projectCode', { length: 64 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    leadId: uuid('leadId'),
    pipelineId: uuid('pipelineId'),
    status: projectStatusEnum('status').notNull().default('Planning'),
    contractValue: numeric('contractValue', { mode: 'number' }).notNull().default(0),
    approvedBudget: numeric('approvedBudget', { mode: 'number' }).notNull().default(0),
    billingSchedule: jsonb('billingSchedule').notNull().default([]),
    currency: varchar('currency', { length: 10 }).notNull().default('INR'),
    startDate: timestamp('startDate', { withTimezone: true }),
    endDate: timestamp('endDate', { withTimezone: true }),
    projectManager: uuid('projectManager'),
    clientName: varchar('clientName', { length: 255 }),
    createdBy: uuid('createdBy'),
    createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    projectCodeUniqueIdx: uniqueIndex('projects_projectCode_unique_idx').on(table.projectCode),
    pipelineIdUniqueIdx: uniqueIndex('projects_pipelineId_unique_idx').on(table.pipelineId),
    leadIdIdx: index('projects_leadId_idx').on(table.leadId),
    statusIdx: index('projects_status_idx').on(table.status),
    projectManagerIdx: index('projects_projectManager_idx').on(table.projectManager),
    createdAtIdx: index('projects_createdAt_idx').on(table.createdAt),
  }),
);
